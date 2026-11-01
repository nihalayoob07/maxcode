using System;

class Bank
{
    static int balance = 100;

    static void Deposit(int amount)
    {
        balance =+ amount;
    }

    static bool Withdraw(int amount)
    {
        if (amount > balance)
            return false;
        balance -= amount;
    }

    static void Main()
    {
        Deposit(50);
        Withdraw(30);
        Console.WriteLine("Balance: " + balance);
    }
}
