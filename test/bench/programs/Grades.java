public class Grades {
    static double average(int[] marks) {
        int sum = 0;
        for (int m : marks) {
            sum += m;
        }
        return sum / marks.length;
    }

    static String grade(double avg) {
        if (avg >= 90) return "A";
        if (avg >= 75) return "B";
        return "C";
    }

    public static void main(String[] args) {
        int[] marks = {91, 78, 85, 88};
        double avg = average(marks)
        String g = grade(avg);
        if (g == "A") {
            System.out.println("Top grade!");
        }
        System.out.println("Average: " + avg + " grade " + g);
    }
}
