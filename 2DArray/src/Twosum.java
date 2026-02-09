import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Twosum {

    static void main() {
        int[] nums = {3, 0, 4};
        int k = 3;

        System.out.println(twoSum(nums, k));
    }

    public static int[] twoSum(int[] nums, int k) {
       //BEST APPROACH

        //initialize a map
        Map<Integer, Integer> map = new HashMap<>();
        //have a for loop to loop through all the values
        for(int i=0; i<nums.length; i++){
            int complement = k - nums[i];
            if (map.containsKey(complement)){
                return new int[]{map.get(complement), i};
            }else{
                map.put(nums[i], i);
            }
        }

        throw new IllegalArgumentException("No match found");

       /* //BRUTEFORCE APPROACH
        for(int i = 0; i<nums.length; i++){
            for (int j=i+ 1;j<nums.length; j++){
                if ((nums[i]+nums[j])==k){
                    return new int[]{i,j};
                }
            }
        }
       throw new IllegalArgumentException("No Match found");*/
    }
}
