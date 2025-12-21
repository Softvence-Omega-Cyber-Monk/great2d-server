import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserDto, UserResponseDto } from './dto/user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guards';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from 'generated/prisma';
import { ParseFormDataPipe } from 'src/pipes/parse-boolean.pipe';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  @ApiResponse({
    status: 200,
    description: 'Return current user profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCurrentUser(@GetUser('userId') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Patch('me')
  @UseInterceptors(FileInterceptor('profilePicture'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update current logged-in user profile with optional image upload' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'John Doe' },
        phone: { type: 'string', example: '+1234567890' },
        isDarkMode: { type: 'boolean', example: true },
        isNotificationsEnabled: { type: 'boolean', example: true },
        isUsingBiometrics: { type: 'boolean', example: false },
        profilePicture: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture image file (jpg, jpeg, png, webp)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid file type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCurrentUser(
    @GetUser('userId') userId: string,
    @Body(new ParseFormDataPipe()) updateUserDto: UpdateUserDto,
    @UploadedFile() file?: any,
  ) {
    // Validate file type if file is uploaded
    if (file) {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, JPG, PNG, and WEBP images are allowed.',
        );
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new BadRequestException('File size too large. Maximum size is 5MB.');
      }
    }

    return this.usersService.updateMe(userId, updateUserDto, file);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete current logged-in user account (soft delete)' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  deleteCurrentUser(@GetUser('userId') userId: string) {
    return this.usersService.removeMe(userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Return all users',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('deleted/list')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get all soft-deleted users (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Return all deleted users',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  findAllDeleted() {
    return this.usersService.findAllDeleted();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('profilePicture'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update user by ID with optional image upload' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'John Doe' },
        phone: { type: 'string', example: '+1234567890' },
        isDarkMode: { type: 'boolean', example: true },
        isNotificationsEnabled: { type: 'boolean', example: true },
        isUsingBiometrics: { type: 'boolean', example: false },
        profilePicture: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture image file (jpg, jpeg, png, webp)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid file type' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only update own profile' })
  async update(
    @Param('id') id: string,
    @GetUser('userId') requestUserId: string,
    @Body(new ParseFormDataPipe()) updateUserDto: UpdateUserDto,
    @UploadedFile() file?: any,
  ) {
    // Validate file type if file is uploaded
    if (file) {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, JPG, PNG, and WEBP images are allowed.',
        );
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new BadRequestException('File size too large. Maximum size is 5MB.');
      }
    }

    return this.usersService.update(id, requestUserId, updateUserDto, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID (soft delete)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only delete own account' })
  remove(@Param('id') id: string, @GetUser('userId') requestUserId: string) {
    return this.usersService.remove(id, requestUserId);
  }

  @Post(':id/restore')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Restore soft-deleted user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  restore(@Param('id') id: string) {
    return this.usersService.restore(id);
  }

  @Delete(':id/permanent')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Permanently delete user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User permanently deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  permanentDelete(@Param('id') id: string) {
    return this.usersService.permanentDelete(id);
  }
}