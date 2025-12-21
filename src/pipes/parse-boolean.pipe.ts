import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ParseFormDataPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' || !metadata.metatype) {
      return value;
    }

    // Convert string booleans to actual booleans
    const transformed = { ...value };

    const booleanFields = ['isDarkMode', 'isNotificationsEnabled', 'isUsingBiometrics'];

    booleanFields.forEach(field => {
      if (transformed[field] !== undefined) {
        if (transformed[field] === 'true') {
          transformed[field] = true;
        } else if (transformed[field] === 'false') {
          transformed[field] = false;
        }
      }
    });

    // Transform to class instance and validate
    const object = plainToInstance(metadata.metatype, transformed);
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = errors.map(error => 
        Object.values(error.constraints || {}).join(', ')
      );
      throw new BadRequestException(messages);
    }

    return transformed;
  }
}