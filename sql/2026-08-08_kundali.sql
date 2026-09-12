-- Stored birth charts.
--
-- A chart costs a Lambda round trip that cold-starts into a couple of seconds,
-- and it is deterministic from three fields that almost never change. Computing
-- it on every profile view was pure waste - and it gets worse with matching,
-- where comparing two people needs both charts and a list screen would need
-- dozens.
--
-- Its own table rather than columns on user_profile, for two reasons. The chart
-- JSON and its SVG are several kilobytes, and user_profile is read on every
-- feed page - widening that row would slow down every listing to serve a
-- feature most requests do not touch. And a one-to-one table lets the whole
-- chart be dropped and rebuilt with a DELETE, without an UPDATE that has to
-- name every column.
--
-- Safe to run twice.

SET @schema := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'kundali'
);

SET @sql := IF(@exists = 0, '
  CREATE TABLE kundali (
    user_id      INT          NOT NULL PRIMARY KEY,

    -- The Lambda response verbatim: ascendant, all nine grahas, houses, and
    -- the SVG. Stored whole rather than shredded into columns because the app
    -- renders it as-is, and because the Lambda is free to add fields without
    -- a migration here.
    chart        LONGTEXT     NOT NULL,

    -- Denormalised out of the JSON purely so matching can work in SQL and in
    -- the match Lambda without parsing every chart. Ashtakoota needs exactly
    -- these two numbers from each side.
    nakshatra_index TINYINT   NOT NULL COMMENT ''0-26, Ashwini is 0'',
    rashi_index     TINYINT   NOT NULL COMMENT ''0-11, Mesh is 0. Moon sign, not lagna.'',

    -- Readable copies for display and support questions.
    nakshatra    VARCHAR(32)  NOT NULL,
    rashi        VARCHAR(32)  NOT NULL,
    manglik      TINYINT(1)   NOT NULL DEFAULT 0,

    -- SHA-256 of the birth date, time and place the chart was built from.
    -- A chart is only valid for the inputs that produced it, and people do
    -- correct their birth time after asking a parent. Comparing this against
    -- the current profile makes a stale chart detectable rather than silently
    -- wrong - which matters more here than elsewhere, because an hour of error
    -- moves the ascendant by roughly a whole sign.
    birth_fingerprint CHAR(64) NOT NULL,

    generated_at DATETIME     NOT NULL,

    CONSTRAINT fk_kundali_user FOREIGN KEY (user_id)
      REFERENCES user_profile (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
', 'SELECT ''skipped: kundali already exists''');

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kundali'
ORDER BY ORDINAL_POSITION;
