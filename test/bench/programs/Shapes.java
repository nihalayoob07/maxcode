public class Shapes {
    static double circle(double r) {
        return Math.PI * r * r;
    }

    public static void main(String[] args) {
        int n = 7;
        int half = n / 2;
        System.out.println("Area: " + circle(2.0));
        System.out.println("Half of " + n + " is " + half);
    }
}
