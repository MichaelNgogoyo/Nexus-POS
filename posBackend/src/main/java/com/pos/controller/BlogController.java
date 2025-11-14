package com.pos.controller;

import com.pos.dto.BlogRequest;
import com.pos.model.Blog;
import com.pos.service.impl.BlogService;
import org.springframework.http.RequestEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/blogs/")
public class BlogController {

    private BlogService blogService;

    //create blog
    @PostMapping("/create")
    public void createBlog(@RequestBody BlogRequest request) {
        blogService.createBlog(request);
    }
}
