import java.util.ArrayList;
import java.util.List;

public class Library {
    public static void main(String[] args) {
        List<String> books = new ArrayList<>();
        books.add("Dune");
        books.add("Emma");
        String last = books.get(books.size());
        System.out.println("Last book: " + last);
        String wanted = new String("Dune");
        if (books.get(0) == wanted) {
            System.out.println("Found it");
        }
    }
}
