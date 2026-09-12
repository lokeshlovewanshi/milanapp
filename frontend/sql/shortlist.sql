CREATE TABLE `shortlist` (
  `profile_id` int NOT NULL,
  `shortlist_id` int NOT NULL,
  PRIMARY KEY (`profile_id`,`shortlist_id`),
  KEY `shortlist_ibfk_2_idx` (`shortlist_id`),
  CONSTRAINT `shortlist_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profile` (`id`),
  CONSTRAINT `shortlist_ibfk_2` FOREIGN KEY (`shortlist_id`) REFERENCES `user_profile` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
