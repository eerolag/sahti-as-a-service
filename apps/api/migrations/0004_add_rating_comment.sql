ALTER TABLE ratings ADD COLUMN comment TEXT CHECK(comment IS NULL OR length(comment) <= 255);
