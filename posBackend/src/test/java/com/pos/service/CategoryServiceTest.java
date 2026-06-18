package com.pos.service;

import com.pos.model.Category;
import com.pos.model.Product;
import com.pos.repository.CategoryRepository;
import com.pos.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductRepository productRepository;

    private CategoryService service;

    @BeforeEach
    void setUp() {
        service = new CategoryService(categoryRepository, productRepository);
    }

    @Test
    void createRejectsBlankName() {
        assertThatThrownBy(() -> service.create("   "))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Category name is required");

        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    void createRejectsDuplicateNameIgnoringCase() {
        when(categoryRepository.findByNameIgnoreCase("dairy"))
                .thenReturn(Optional.of(Category.builder().id(1L).name("Dairy").build()));

        assertThatThrownBy(() -> service.create("dairy"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Category already exists");
    }

    @Test
    void deleteReassignsProductsToUncategorizedAndRemovesCategory() {
        Category toDelete = Category.builder().id(2L).name("Bakery").productCount(2).build();
        Category uncategorized = Category.builder().id(1L).name("Uncategorized").productCount(3).build();
        Product p1 = Product.builder().id(10L).name("Bread").category(toDelete).build();
        Product p2 = Product.builder().id(11L).name("Cake").category(toDelete).build();

        when(categoryRepository.findById(2L)).thenReturn(Optional.of(toDelete));
        when(categoryRepository.findByNameIgnoreCase("Uncategorized")).thenReturn(Optional.of(uncategorized));
        when(productRepository.findByCategory(toDelete)).thenReturn(List.of(p1, p2));

        service.delete(2L);

        assertThat(p1.getCategory()).isEqualTo(uncategorized);
        assertThat(p2.getCategory()).isEqualTo(uncategorized);
        assertThat(uncategorized.getProductCount()).isEqualTo(5);

        verify(productRepository).saveAll(List.of(p1, p2));
        verify(categoryRepository).save(uncategorized);
        verify(categoryRepository).delete(toDelete);
    }

    @Test
    void deleteRejectsUncategorizedCategory() {
        Category uncategorized = Category.builder().id(1L).name("Uncategorized").productCount(0).build();
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(uncategorized));
        when(categoryRepository.findByNameIgnoreCase("Uncategorized")).thenReturn(Optional.of(uncategorized));

        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cannot delete the Uncategorized category");

        verify(categoryRepository, never()).delete(any(Category.class));
    }

    @Test
    void getOrCreateUncategorizedCreatesCategoryWhenMissing() {
        when(categoryRepository.findByNameIgnoreCase("Uncategorized")).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class)))
                .thenAnswer(inv -> inv.getArgument(0, Category.class));

        Category created = service.getOrCreateUncategorized();

        ArgumentCaptor<Category> categoryCaptor = ArgumentCaptor.forClass(Category.class);
        verify(categoryRepository).save(categoryCaptor.capture());

        assertThat(created.getName()).isEqualTo("Uncategorized");
        assertThat(categoryCaptor.getValue().getProductCount()).isEqualTo(0);
    }
}

