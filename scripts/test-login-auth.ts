import { AuthService } from '../src/modules/auth/auth-service';
import { prisma } from '../src/shared/database/client';

async function test() {
  try {
    console.log('Testing loginWithPassword for operator@example.com...');
    const res = await AuthService.loginWithPassword('operator@example.com', 'StrongPass123!Secure', {
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent/1.0',
    });
    console.log('SUCCESS! Authenticated user:', {
      id: res.user.id,
      email: res.user.email,
      fullName: res.user.fullName,
      tokenLength: res.rawToken.length,
    });
  } catch (err) {
    console.error('Login failed with error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
