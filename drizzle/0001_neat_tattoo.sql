CREATE TABLE `bids` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`participantId` int NOT NULL,
	`bidAmount` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bids_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`startingPrice` decimal(10,2) NOT NULL,
	`status` enum('pending','active','completed') NOT NULL DEFAULT 'pending',
	`winnerId` int,
	`winningBidAmount` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`guestName` varchar(255) NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` varchar(8) NOT NULL,
	`hostUserId` int NOT NULL,
	`status` enum('waiting','active','completed') NOT NULL DEFAULT 'waiting',
	`currentItemId` int,
	`currentRoundActive` boolean NOT NULL DEFAULT false,
	`currentRoundEndTime` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `rooms_roomId_unique` UNIQUE(`roomId`)
);
