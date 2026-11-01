public class Stack {
    private int[] data = new int[10];
    private int size = 0;

    void push(int x) {
        if (size == data.length) {
            throw new IllegalStateException("full");
        }
        data[size++] = x;
    }

    int pop() {
        if (size == 0) {
            throw new IllegalStateException("empty");
        }
        return data[--size];
    }

    public static void main(String[] args) {
        Stack s = new Stack();
        s.push(1);
        s.push(2);
        System.out.println(s.pop() + s.pop());
    }
}
