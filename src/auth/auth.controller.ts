import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtGuard } from './guards/jwt.guards';
import { GetUser } from './decorators/get-user.decorator';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.fullName,
    );
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Get('profile')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Return user profile',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@GetUser('userId') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('change-password')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @GetUser('userId') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }
}