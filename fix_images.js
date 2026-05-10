const { Tour, Blog } = require('./models');

async function fixImages() {
  const defaultTourImg = 'https://images.unsplash.com/photo-1528127269322-539801943592?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';
  const defaultBlogImg = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

  let toursUpdated = 0;
  let blogsUpdated = 0;

  try {
    const tours = await Tour.findAll();
    for (let tour of tours) {
      if (!tour.image_url || tour.image_url.trim() === '') {
        await tour.update({ image_url: defaultTourImg });
        toursUpdated++;
      }
    }

    const blogs = await Blog.findAll();
    for (let blog of blogs) {
      if (!blog.image_url || blog.image_url.trim() === '') {
        await blog.update({ image_url: defaultBlogImg });
        blogsUpdated++;
      }
    }
    console.log("Updated " + toursUpdated + " tours and " + blogsUpdated + " blogs with default images.");
  } catch(e) {
    console.error('Error updating images:', e);
  }
}

fixImages();
