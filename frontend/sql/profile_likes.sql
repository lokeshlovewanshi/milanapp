CREATE TABLE `profile_likes` (
  `liked_profile_id` int NOT NULL,
  `liker_id` int NOT NULL,
  `liked_at` datetime DEFAULT NULL,
  `status` varchar(45) DEFAULT '\0',
  PRIMARY KEY (`liked_profile_id`,`liker_id`),
  CONSTRAINT `profile_like_ibfk_1` FOREIGN KEY (`liked_profile_id`) REFERENCES `user_profile` (`id`),
  CONSTRAINT `profile_like_ibfk_2` FOREIGN KEY (`liked_profile_id`) REFERENCES `user_profile` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
