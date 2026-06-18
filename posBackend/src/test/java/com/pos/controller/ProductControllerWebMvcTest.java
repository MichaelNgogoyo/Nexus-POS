package com.pos.controller;

import com.pos.model.Product;
import com.pos.service.impl.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ProductControllerWebMvcTest {

    @Mock
    private ProductService productService;

    private MockMvc mockMvc;
    private ProductController controller;

    @BeforeEach
    void setUp() {
        controller = new ProductController();
        ReflectionTestUtils.setField(controller, "productService", productService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void createProductRejectsEmptyFile() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "", MediaType.IMAGE_PNG_VALUE, new byte[0]);

        mockMvc.perform(multipart("/api/product/create")
                        .file(emptyFile)
                        .param("name", "Milk")
                        .param("price", "10.50")
                        .param("active", "true")
                        .param("discount", "0")
                        .param("quantity", "5"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Image file is required"));
    }

    @Test
    void createProductWithFileCallsService() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "milk.png", MediaType.IMAGE_PNG_VALUE, "img".getBytes());
        ResponseEntity<?> serviceResponse = ResponseEntity.ok(Map.of("id", 1L, "name", "Milk"));
        doReturn(serviceResponse).when(productService).createProduct(any(), any());

        mockMvc.perform(multipart("/api/product/create")
                        .file(file)
                        .param("name", "Milk")
                        .param("price", "10.50")
                        .param("active", "true")
                        .param("discount", "5")
                        .param("quantity", "5")
                        .param("category", "Dairy"))
                .andExpect(status().isOk());

        verify(productService).createProduct(any(), any());
    }

    @Test
    void searchProductsReturnsPage() {
        Product product = Product.builder()
                .id(11L)
                .name("Bread")
                .price(new BigDecimal("8.50"))
                .quantity(20)
                .active(true)
                .build();
        Page<Product> page = new PageImpl<>(List.of(product));
        when(productService.searchProducts(eq("bre"), eq(0), eq(12))).thenReturn(page);

        ResponseEntity<Page<Product>> response = controller.searchProducts("bre", 0, 12);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getContent()).hasSize(1);
        assertThat(response.getBody().getContent().get(0).getId()).isEqualTo(11L);
        verify(productService).searchProducts("bre", 0, 12);
    }

    @Test
    void getProductImageReturnsDetectedMimeType() throws Exception {
        byte[] imageBytes = new byte[]{1, 2, 3};
        Product product = Product.builder().id(9L).imageURL("product-9.png").build();

        when(productService.getImageByProductId(9)).thenReturn(imageBytes);
        when(productService.getProductById(9L)).thenReturn(product);

        mockMvc.perform(get("/api/product/9/image"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(content().bytes(imageBytes));

        verify(productService).getImageByProductId(9);
        verify(productService).getProductById(9L);
    }
}
