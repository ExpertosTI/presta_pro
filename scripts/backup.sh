#!/bin/bash
# PostgreSQL Daily Backup Script for RenKredit
# Runs automatically via cron daily at 2:00 AM

BACKUP_DIR="/backups"
DB_CONTAINER="prestapro_db"
DB_NAME="prestapro"
DB_USER="prestapro"
DAYS_TO_KEEP=7

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/prestapro_backup_${TIMESTAMP}.sql.gz"

# Log start
echo "[$(date)] Starting backup..."

# Perform backup (compressed)
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
    echo "[$(date)] Backup successful: $BACKUP_FILE"
    echo "[$(date)] Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    
    # Delete old backups (keep last N days)
    find "$BACKUP_DIR" -name "prestapro_backup_*.sql.gz" -type f -mtime +$DAYS_TO_KEEP -delete
    echo "[$(date)] Cleaned up backups older than $DAYS_TO_KEEP days"
else
    echo "[$(date)] ERROR: Backup failed!"
    rm -f "$BACKUP_FILE" 2>/dev/null
    exit 1
fi

# List remaining backups
echo "[$(date)] Current backups:"
ls -lh "$BACKUP_DIR/prestapro_backup_"*.sql.gz 2>/dev/null | tail -10

echo "[$(date)] Backup completed successfully"
