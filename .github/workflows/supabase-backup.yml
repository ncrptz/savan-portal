name: Supabase Backup

# Weekly automated backup of the Supabase database + storage buckets.
# The archive is AES-256 encrypted before it is stored, so it is safe even
# though this repository is public. Trigger manually any time from the
# Actions tab ("Run workflow").

on:
  schedule:
    - cron: '17 2 * * 0'   # every Sunday 02:17 UTC (03:17 Lagos)
  workflow_dispatch: {}

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install pg_dump (v17)
        run: |
          sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
          curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg
          sudo apt-get update
          sudo apt-get install -y postgresql-client-17

      - name: Dump database
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: |
          mkdir -p backup
          pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges -f backup/database.sql
          echo "Database dump size: $(du -h backup/database.sql | cut -f1)"

      - name: Export storage buckets
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: node .github/scripts/export-storage.mjs

      - name: Archive and encrypt
        env:
          BACKUP_PASSPHRASE: ${{ secrets.BACKUP_PASSPHRASE }}
        run: |
          STAMP=$(date -u +%Y%m%d-%H%M)
          tar -czf backup.tar.gz -C backup .
          gpg --batch --yes --symmetric --cipher-algo AES256 \
            --passphrase "$BACKUP_PASSPHRASE" \
            -o "savan-backup-$STAMP.tar.gz.gpg" backup.tar.gz
          rm -rf backup backup.tar.gz
          echo "STAMP=$STAMP" >> "$GITHUB_ENV"

      - name: Upload encrypted backup
        uses: actions/upload-artifact@v4
        with:
          name: savan-backup-${{ env.STAMP }}
          path: "*.tar.gz.gpg"
          retention-days: 90
