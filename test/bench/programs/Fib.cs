using System;

class Fib
{
    static long Nth(int n)
    {
        long a = 0, b = 1;
        for (int i = 0; i < n; i++)
        {
            long t = a + b;
            a = b;
            b = t;
        }
        return a;
    }

    static void Main()
    {
        Console.WriteLine(Nth(10));
    }
}
