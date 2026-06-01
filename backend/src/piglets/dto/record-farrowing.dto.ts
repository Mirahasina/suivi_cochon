import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class RecordFarrowingDto {
    @IsInt()
    motherId: number;

    @IsDateString()
    actualDate: string; // ISO 8601 format

    @IsInt()
    @Min(0)
    bornAlive: number;

    @IsInt()
    @Min(0)
    stillborn: number;

    @IsInt()
    @IsOptional()
    fatherId?: number;
}
