import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto, UserResponseDto } from './dto/user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guards';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from 'generated/prisma';

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
  @ApiOperation({ summary: 'Update current logged-in user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateCurrentUser(
    @GetUser('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateMe(userId, updateUserDto);
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
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only update own profile' })
  update(
    @Param('id') id: string,
    @GetUser('userId') requestUserId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, requestUserId, updateUserDto);
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