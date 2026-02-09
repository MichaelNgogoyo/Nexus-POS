import java.util.*;


public class RemoveDuplicatesFromSortedArray {

    static void main() {
        RemoveDuplicatesFromSortedArray rm = new RemoveDuplicatesFromSortedArray();
        int [] nums = {0,0,1,1,1,2,2,3,3,4};
        int k = rm.removeDuplicates(nums);

        System.out.println("K is "+k);

    }


    public int removeDuplicates(int[] nums) {
        Set<Integer> set = new HashSet<>();

        for(int i=0; i<nums.length; i++){
            if (!set.contains(nums[i])){
                set.add(nums[i]);
            }
        }

        System.out.println(set);
        int[] expectedNums = set.stream().mapToInt(Integer::intValue).toArray();
        for(int a : expectedNums){
            System.out.print(a +", ");
        }

        return expectedNums.length;
    }
}
