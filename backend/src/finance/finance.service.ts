import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Expense } from '../entities/expense.entity';
import { FeedingEntry } from '../entities/feeding-entry.entity';
import { Pig } from '../entities/pig.entity';
import { Piglet } from '../entities/piglet.entity';

@Injectable()
export class FinanceService {
    constructor(
        @InjectRepository(Pig) private pigRepo: Repository<Pig>,
        @InjectRepository(Piglet) private pigletRepo: Repository<Piglet>,
        @InjectRepository(FeedingEntry) private feedingRepo: Repository<FeedingEntry>,
        @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    ) {}

    async getSummary(month?: number, year?: number) {
        const now = new Date();
        const usePeriod = month != null && year != null;
        const m = usePeriod ? month : now.getMonth() + 1;
        const y = usePeriod ? year : now.getFullYear();

        let dateFrom: Date | null = null;
        let dateTo: Date | null = null;
        if (usePeriod) {
            dateFrom = new Date(y, m - 1, 1, 0, 0, 0, 0);
            dateTo = new Date(y, m, 0, 23, 59, 59, 999);
        }

        const soldPigs = await this.pigRepo.find({ where: { status: 'SOLD' } });
        const soldPiglets = await this.pigletRepo.find({ where: { status: 'SOLD' } });

        const inPeriod = (d?: Date | string | null) => {
            if (!usePeriod) return true;
            if (!d) return false;
            const t = new Date(d).getTime();
            return t >= dateFrom!.getTime() && t <= dateTo!.getTime();
        };

        const pigsInPeriod = soldPigs.filter((p) => inPeriod(p.saleDate));
        const pigletsInPeriod = soldPiglets.filter((p) => inPeriod(p.saleDate));

        const pigRevenue = pigsInPeriod.reduce((s, p) => s + Number(p.salePrice || 0), 0);
        const pigletRevenue = pigletsInPeriod.reduce((s, p) => s + Number(p.salePrice || 0), 0);
        const revenue = pigRevenue + pigletRevenue;

        // Purchase cost: for sold animals in period, use their purchase price;
        // also include active pigs' purchase when viewing "all" is handled via feed+purchase of all.
        // Plan: purchase of animals sold in period + for period filter also count purchases dated in period of any pig.
        const allPigs = await this.pigRepo.find();
        let purchaseCost = 0;
        if (usePeriod) {
            for (const pig of allPigs) {
                if (pig.purchaseDate && inPeriod(pig.purchaseDate)) {
                    purchaseCost += Number(pig.purchasePrice || 0);
                } else if (!pig.purchaseDate && pigsInPeriod.some((s) => s.id === pig.id)) {
                    // sold this period without purchase date → attribute purchase to sale period
                    purchaseCost += Number(pig.purchasePrice || 0);
                }
            }
        } else {
            purchaseCost = allPigs.reduce((s, p) => s + Number(p.purchasePrice || 0), 0);
        }

        let feedCost = 0;
        if (usePeriod) {
            const feeds = await this.feedingRepo.find({
                where: { date: Between(dateFrom!, dateTo!) },
            });
            feedCost = feeds.reduce((s, e) => s + Number(e.costAriary || 0), 0);
        } else {
            const feeds = await this.feedingRepo.find();
            feedCost = feeds.reduce((s, e) => s + Number(e.costAriary || 0), 0);
        }

        const expenses = usePeriod
            ? await this.expenseRepo.find({
                  where: { date: Between(dateFrom!, dateTo!) },
                  order: { date: 'DESC' },
              })
            : await this.expenseRepo.find({ order: { date: 'DESC' } });

        const otherExpenses = expenses.reduce((s, e) => s + Number(e.amountAriary || 0), 0);

        const expenseBreakdown: Record<string, number> = {};
        for (const e of expenses) {
            expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + Number(e.amountAriary || 0);
        }

        const totalCost = purchaseCost + feedCost + otherExpenses;
        const profit = revenue - totalCost;

        const recentSales = [
            ...pigsInPeriod.map((p) => ({
                kind: 'pig' as const,
                id: p.id,
                name: p.name,
                saleType: p.saleType,
                saleWeightKg: p.saleWeightKg,
                saleLiveWeightKg: p.saleLiveWeightKg,
                salePrice: Number(p.salePrice || 0),
                saleDate: p.saleDate,
            })),
            ...pigletsInPeriod.map((p) => ({
                kind: 'piglet' as const,
                id: p.id,
                name: p.name || `Porcelet #${p.id}`,
                saleType: p.saleType,
                saleWeightKg: p.saleWeightKg,
                saleLiveWeightKg: p.saleLiveWeightKg,
                salePrice: Number(p.salePrice || 0),
                saleDate: p.saleDate,
            })),
        ].sort((a, b) => new Date(b.saleDate || 0).getTime() - new Date(a.saleDate || 0).getTime());

        return {
            month: usePeriod ? m : null,
            year: usePeriod ? y : null,
            periodLabel: usePeriod ? `${m}/${y}` : 'Tout',
            revenue,
            pigRevenue,
            pigletRevenue,
            purchaseCost,
            feedCost,
            otherExpenses,
            totalCost,
            profit,
            expenseBreakdown,
            expenses: expenses.slice(0, 50),
            recentSales: recentSales.slice(0, 20),
            soldPigsCount: pigsInPeriod.length,
            soldPigletsCount: pigletsInPeriod.length,
        };
    }
}
