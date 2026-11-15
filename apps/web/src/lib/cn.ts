// path: apps/web/src/lib/cn.ts
// purpose: Tailwind class-name merging helper.
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
