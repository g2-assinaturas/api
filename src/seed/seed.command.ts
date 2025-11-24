import { Command, CommandRunner } from 'nest-commander';
import { SeedService } from './seed.service';

@Command({
  name: 'seed:super-admin',
  description: 'Cria o usuário Super Admin inicial',
})
export class SeedCommand extends CommandRunner {
  constructor(private readonly seedService: SeedService) {
    super();
  }

  async run(): Promise<void> {
    console.log('🚀 Iniciando seed do Super Admin...');

    try {
      const alreadySeeded = await this.seedService.isSuperAdminSeeded();
      if (alreadySeeded) {
        console.log('✅ Super Admin já existe no banco. Nada a fazer.');
        return;
      }

      const superAdmin = await this.seedService.seedSuperAdmin();

      if (superAdmin) {
        console.log('✅ Super Admin criado com sucesso!');
        console.log(`📧 Email: ${superAdmin.email}`);
        console.log(`👤 Nome: ${superAdmin.name}`);
        console.log(`🆔 ID: ${superAdmin.id}`);
      } else {
        console.log('❌ Falha ao criar Super Admin');
      }
    } catch (error) {
      console.error('❌ Erro durante o seed:', error.message);
      process.exit(1);
    }
  }
}
