using System;

class Grade
{
    static char Letter(int score)
    {
        char grade = 'F';
        if (score >= 90) grade = 'A';
        if (score >= 80) grade = 'B';
        if (score >= 70) grade = 'C';
        return grade;
    }

    static void Main()
    {
        Console.WriteLine(Letter(95));
    }
}
