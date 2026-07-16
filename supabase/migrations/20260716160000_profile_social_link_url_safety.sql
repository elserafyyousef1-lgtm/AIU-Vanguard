-- SECURITY: profiles.linkedin / profiles.github are rendered as <a href=…> on public
-- profile pages. Client-side validation is bypassable via a forged PATCH, which let an
-- attacker store `github = 'javascript:…'` → stored XSS in any viewer who clicks the link.
-- Enforce the URL shape at the database so no forged request can inject a dangerous scheme.
-- NULL stays allowed (fields are optional). Reversible: DROP CONSTRAINT.
alter table public.profiles
  add constraint profiles_linkedin_url_ck
  check (linkedin is null or linkedin ~* '^https://(www\.)?linkedin\.com/[^[:space:]]*$');

alter table public.profiles
  add constraint profiles_github_url_ck
  check (github is null or github ~* '^https://(www\.)?github\.com/[^[:space:]]*$');
