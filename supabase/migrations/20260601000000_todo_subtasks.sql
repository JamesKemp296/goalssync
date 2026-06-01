alter table todos
  add column parent_id bigint references todos(id) on delete cascade;
