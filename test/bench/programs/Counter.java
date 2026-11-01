import java.util.HashMap;
import java.util.Map;

public class Counter {
    public static void main(String[] args) {
        String text = "the cat and the hat";
        Map<String, Integer> counts = new HashMap<>();
        for (String w : text.split(" ")) {
            counts.put(w, counts.getOrDefault(w, 0) + 1);
        }
        System.out.println(counts.get("the"));
    }
}
