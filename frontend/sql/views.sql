CREATE TABLE `views` (
  `profile_id` int NOT NULL,
  `viewed_by` int NOT NULL,
  `viewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`profile_id`,`viewed_by`),
  KEY `views_ibfk_2_idx` (`viewed_by`),
  CONSTRAINT `views_ibfk_1` FOREIGN KEY (`profile_id`) REFERENCES `user_profile` (`id`),
  CONSTRAINT `views_ibfk_2` FOREIGN KEY (`viewed_by`) REFERENCES `user_profile` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
