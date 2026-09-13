package com.match.partner;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * @EnableAsync is required for PushService's @Async methods to actually run off
 * the request thread. Without it Spring silently ignores the annotation and every
 * push blocks the HTTP call that triggered it - liking a profile would wait on
 * Firebase.
 */
@SpringBootApplication
@EnableAsync
public class PartnerApplication {

	public static void main(String[] args) {
		SpringApplication.run(PartnerApplication.class, args);
	}

}
