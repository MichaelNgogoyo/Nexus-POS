package com.pos.service.impl;

import com.pos.dto.BlogRequest;
import com.pos.model.Blog;
import com.pos.repository.BlogRepository;
import com.pos.service.IBlogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class BlogService implements IBlogService {

    @Autowired
    private BlogRepository blogRepository;


    public Blog createBlog(BlogRequest blogRequest) {
        Blog blog = new Blog();
        blog.setTitle(blogRequest.title());
        blog.setBody(blogRequest.body());
        blog.setAuthor(blogRequest.author());
        return blogRepository.save(blog);
    }
}
