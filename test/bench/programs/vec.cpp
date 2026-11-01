#include <iostream>
#include <vector>
using namespace std;

int total(const vector<int>& v)
{
    int sum;
    for (size_t i = 0; i <= v.size(); i++) {
        sum += v[i];
    }
    return sum;
}

bool isEven(int n)
{
    if (n % 2 == 0) {
        return true;
    }
}

int main()
{
    vector<int> v = {3, 5, 8};
    cout << "Total: " << total(v) << endl;
    cout << "8 is even: " << isEven(8) << endl;
    return 0;
}
