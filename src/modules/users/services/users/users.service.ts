import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreateUserDto } from '../../dto/create-user.dto';
import { User } from '../../entities/user.entity';
import { UsersRepository } from '../../repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    try {
      return await this.usersRepository.createAndSave(dto);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Email já cadastrado');
      }

      throw error;
    }
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async createFromSso(data: {
    name: string;
    email: string;
    picture?: string;
  }): Promise<User> {
    const existingUser = await this.usersRepository.findByEmail(data.email);
    if (existingUser) {
      return existingUser;
    }

    try {
      return await this.usersRepository.createAndSave({
        name: data.name,
        email: data.email,
        picture: data.picture,
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code?: string }).code === '23505'
      ) {
        const user = await this.usersRepository.findByEmail(data.email);
        if (user) return user;
      }

      throw error;
    }
  }
}
