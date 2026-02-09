import java.util.Scanner;
void main(String[] args) {

//    print("Hello Mike, 2D array loading");
    Scanner scanner = new Scanner(System.in);

    System.out.println("Enter the number of rows r: ");
    int m =scanner.nextInt();

    System.out.println("Enter the number of columns c: ");
    int n =scanner.nextInt();

    int[][] arr =new int [m][n];

    for(int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            arr[i][j] = scanner.nextInt();
        }
    }

    for(int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            System.out.print(arr[i][j]+" ");
        }
        System.out.println();
    }
}
