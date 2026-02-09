public class FrequencyCountChar {

    static void main() {

        String s = "banana";

        for (char c : s.toCharArray()){
            System.out.println(c + " -> " + (c - 'a'));
        }
    }


}
