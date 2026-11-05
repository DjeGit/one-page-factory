-- Auteur des articles de blog (05/11/2026, demande Jerome) : « Tendpick » au lieu du prénom du fondateur.
-- Ne touche que les articles signés Jerome / Jérôme (insensible à la casse et aux accents).
update public.blog_posts
set author_name = 'Tendpick'
where lower(author_name) in ('jerome', 'jérôme');
