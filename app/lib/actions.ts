
'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCents = amount * 100;
  // date字段的类型是DATE。在PostgreSQL中，DATE类型只存储年月日（也就是精确到天），不存储时间部分。所以即使你插入一个带有时分秒的时间戳，它也会被截断为日期部分。
  // 如果你想要存储精确到时分秒的时间，你应该使用TIMESTAMP或TIMESTAMPTZ（带时区的时间戳）类型。
  const date = new Date().toISOString()// toISOString().split('T')[0];
  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  // console.log('create invoice start', formData)
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
