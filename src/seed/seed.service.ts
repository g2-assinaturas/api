import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seedSuperAdmin() {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    const superAdminName = process.env.SUPER_ADMIN_NAME || 'Super Admin';

    if (!superAdminEmail || !superAdminPassword) {
      this.logger.error(
        'Variáveis de ambiente SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD são obrigatórias',
      );
      return;
    }

    try {
      const existingSuperAdmin = await this.prisma.superAdmin.findUnique({
        where: { email: superAdminEmail },
      });

      if (existingSuperAdmin) {
        this.logger.log('Super Admin já existe no banco de dados');
        return existingSuperAdmin;
      }

      const hashedPassword = await bcrypt.hash(superAdminPassword, 12);

      const superAdmin = await this.prisma.superAdmin.create({
        data: {
          email: superAdminEmail,
          name: superAdminName,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
        },
      });

      this.logger.log(`Super Admin criado com sucesso: ${superAdmin.email}`);
      return superAdmin;
    } catch (error) {
      this.logger.error('Erro ao criar Super Admin:', error);
      throw error;
    }
  }

  async isSuperAdminSeeded(): Promise<boolean> {
    const count = await this.prisma.superAdmin.count();
    return count > 0;
  }
}
