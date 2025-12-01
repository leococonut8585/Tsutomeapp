# �}�C�O���[�V�����K�p�菇

1. ���ϐ� `DATABASE_URL` ��ݒ�  
   ��: `postgresql://user:password@host:port/dbname`

2. �}�C�O���[�V�������s  
   - psql �̏ꍇ:  
     `psql "$DATABASE_URL" -f migrations/0001_gameplay_extensions.sql`  
     `psql "$DATABASE_URL" -f migrations/0002_api_usage_tracking.sql`  
     `psql "$DATABASE_URL" -f migrations/0003_player_auth.sql`

   - drizzle-kit �̏ꍇ�ischema �� `shared/schema.ts` ���Q�Ɓj:  
     `npx drizzle-kit push`

3. �ǉ������e�[�u���E��  
   - `players.username`, `players.password_plain`, `players.role`, `players.suspended`, `players.ai_strictness`, `players.monthly_api_calls`, `players.monthly_api_cost`, `players.api_usage_reset_at`  
   - `items.rarity`, `items.droppable`, `items.drop_rate`�i��equipment��weapon�ɍX�V�j  
   - `drop_history` �e�[�u��

4. ����  
   - �����f�[�^�� `item_type = 'equipment'` �� `weapon` �ɍX�V�ς݂�SQL���܂݂܂��B  
   - `DATABASE_URL` ���ݒ�̏ꍇ�̓������X�g���[�W���g���A�}�C�O���[�V�����͕s�v�ł��B
