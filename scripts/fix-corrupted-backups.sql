-- Réparer les backups marqués corrompus suite au bug de vérification d'intégrité
-- SÛR : remet simplement le status à "ready" pour permettre la réouverture

-- Voir l'état actuel
SELECT id, name, status, size, checksum, error, created_at
FROM backups
ORDER BY id DESC
LIMIT 10;

-- Remettre les backups "corrupted" en "ready" (ils sont récupérables)
UPDATE backups
SET status = 'ready', error = NULL
WHERE status = 'corrupted';
