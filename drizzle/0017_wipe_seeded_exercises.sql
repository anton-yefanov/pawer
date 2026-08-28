-- The library moves from free-exercise-db to the purchased set, and the new
-- slugs derive new UUIDs, so nothing app-owned carries over. Custom exercises
-- and anything logged against them survive.
--
-- Order matters twice over: children before parents, and the `workouts` sweep
-- before `workout_exercises` goes, because it reads what those rows point at.
DELETE FROM `sets` WHERE `workout_exercise_id` IN (
  SELECT `we`.`id` FROM `workout_exercises` `we`
  JOIN `exercises` `e` ON `e`.`id` = `we`.`exercise_id`
  WHERE `e`.`is_custom` = 0
);
--> statement-breakpoint
DELETE FROM `template_sets` WHERE `template_exercise_id` IN (
  SELECT `te`.`id` FROM `template_exercises` `te`
  JOIN `exercises` `e` ON `e`.`id` = `te`.`exercise_id`
  WHERE `e`.`is_custom` = 0
);
--> statement-breakpoint
-- Sessions built only from seeded exercises would survive as zero-exercise rows
-- in History. A workout that also holds a custom exercise still has something
-- to show, and one with no exercises at all is a live empty workout.
DELETE FROM `personal_records` WHERE `workout_id` IN (
  SELECT `we`.`workout_id` FROM `workout_exercises` `we`
  JOIN `exercises` `e` ON `e`.`id` = `we`.`exercise_id` WHERE `e`.`is_custom` = 0
  EXCEPT
  SELECT `we`.`workout_id` FROM `workout_exercises` `we`
  JOIN `exercises` `e` ON `e`.`id` = `we`.`exercise_id` WHERE `e`.`is_custom` = 1
);
--> statement-breakpoint
DELETE FROM `workouts` WHERE `id` IN (
  SELECT `we`.`workout_id` FROM `workout_exercises` `we`
  JOIN `exercises` `e` ON `e`.`id` = `we`.`exercise_id` WHERE `e`.`is_custom` = 0
  EXCEPT
  SELECT `we`.`workout_id` FROM `workout_exercises` `we`
  JOIN `exercises` `e` ON `e`.`id` = `we`.`exercise_id` WHERE `e`.`is_custom` = 1
);
--> statement-breakpoint
DELETE FROM `workout_exercises` WHERE `exercise_id` IN (SELECT `id` FROM `exercises` WHERE `is_custom` = 0);
--> statement-breakpoint
DELETE FROM `template_exercises` WHERE `exercise_id` IN (SELECT `id` FROM `exercises` WHERE `is_custom` = 0);
--> statement-breakpoint
DELETE FROM `personal_records` WHERE `exercise_id` IN (SELECT `id` FROM `exercises` WHERE `is_custom` = 0);
--> statement-breakpoint
DELETE FROM `exercises` WHERE `is_custom` = 0;
--> statement-breakpoint
-- A custom exercise stored the first muscle of the browse group it was created
-- under, in the old vocabulary. Two of those names changed; without this the
-- exercise vanishes from its group (it stays in the Custom section, so it reads
-- as a bug rather than as data loss).
UPDATE `exercises` SET `primary_muscles` = '["core"]'
  WHERE `is_custom` = 1 AND `primary_muscles` = '["abs"]';
--> statement-breakpoint
UPDATE `exercises` SET `primary_muscles` = '["back"]'
  WHERE `is_custom` = 1 AND `primary_muscles` = '["lats"]';
