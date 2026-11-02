import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePigDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    breed: string;

    @IsNotEmpty()
    @IsEnum(['MALE', 'FEMALE'])
    gender: 'MALE' | 'FEMALE';

    @IsOptional()
    @IsDateString()
    birthDate?: string;

    @IsOptional()
    @IsDateString()
    purchaseDate?: string;

    @IsOptional()
    @IsNumber()
    purchasePrice?: number;

    @IsOptional()
    @IsNumber()
    initialWeight?: number;

    @IsBoolean()
    isCastrated: boolean;
}
