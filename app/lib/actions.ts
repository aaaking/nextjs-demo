
'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
  formData?: {
    customerId?: string;
    amount?: string;
    status?: string;
  };
};

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
      formData: {
        customerId: formData.get('customerId') as string,
        amount: formData.get('amount') as string,
        status: formData.get('status') as string,
      },
    };
  }
  const { customerId, amount, status } = validatedFields.data;
  // const { customerId, amount, status } = CreateInvoice.parse({
  //   customerId: formData.get('customerId'),
  //   amount: formData.get('amount'),
  //   status: formData.get('status'),
  // });
  const amountInCents = amount * 100;
  // date字段的类型是DATE。在PostgreSQL中，DATE类型只存储年月日（也就是精确到天），不存储时间部分。所以即使你插入一个带有时分秒的时间戳，它也会被截断为日期部分。
  // 如果你想要存储精确到时分秒的时间，你应该使用TIMESTAMP或TIMESTAMPTZ（带时区的时间戳）类型。
  const date = new Date().toISOString()// toISOString().split('T')[0];
  // Insert data into the database
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    // If a database error occurs, return a more specific error.
    return {
      message: 'Database Error: Failed to Create Invoice.',
      formData: {
        customerId: formData.get('customerId') as string,
        amount: formData.get('amount') as string,
        status: formData.get('status') as string,
      },
    };
  }
  // console.log('create invoice start', formData)
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, formData: FormData) {
  // console.log('update invoice id=' + id, formData)
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

  await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}


export async function deleteInvoice(id: string, formData: FormData) {
  // throw new Error('Failed to Delete Invoice');
  // console.log('delete invoice id=' + id, formData)
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}