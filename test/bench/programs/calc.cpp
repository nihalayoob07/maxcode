#include <iostream>
using namespace std;

int calc(int a, int b, char op)
{
    int r = 0;
    switch (op) {
    case '+':
        r = a + b;
    case '-':
        r = a - b;
        break;
    case '*':
        r = a * b;
        break;
    }
    return r;
}

int main()
{
    cout << calc(6, 3, '+') << endl;
    return 0;
}
