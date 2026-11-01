#include <iostream>
#include <vector>
using namespace std;

double average(const vector<int>& v)
{
    if (v.empty()) return 0.0;
    double sum = 0;
    for (size_t i = 0; i < v.size(); i++) {
        sum += v[i];
    }
    return sum / v.size();
}

int main()
{
    vector<int> v = {4, 8, 15};
    cout << average(v) << endl;
    return 0;
}
