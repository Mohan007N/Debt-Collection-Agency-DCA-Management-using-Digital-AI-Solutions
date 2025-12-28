// Parallax Effects for DCA Platform

class ParallaxManager {
    constructor() {
        this.elements = [];
        this.scrollPosition = 0;
        this.init();
    }

    init() {
        this.registerElements();
        this.bindEvents();
        this.animate();
    }

    registerElements() {
        // Register all parallax elements
        this.elements = Array.from(document.querySelectorAll('[data-parallax]')).map(el => ({
            element: el,
            depth: parseFloat(el.dataset.parallax) || 0.5,
            offset: 0
        }));

        // Register background parallax
        const bgElements = document.querySelectorAll('.parallax-bg');
        bgElements.forEach(bg => {
            this.elements.push({
                element: bg,
                depth: 0.1,
                offset: 0
            });
        });
    }

    bindEvents() {
        // Use requestAnimationFrame for smooth performance
        let ticking = false;
        
        window.addEventListener('scroll', () => {
            this.scrollPosition = window.pageYOffset;
            
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.updatePositions();
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.updatePositions();
        });
    }

    updatePositions() {
        const scrollY = this.scrollPosition;
        
        this.elements.forEach(item => {
            const rate = scrollY * item.depth;
            
            // Apply parallax effect
            if (item.element.classList.contains('parallax-bg')) {
                item.element.style.transform = `translate3d(0, ${rate}px, 0)`;
            } else {
                item.element.style.transform = `translateY(${rate}px)`;
            }
            
            // Add fade effects based on scroll position
            this.applyFadeEffects(item.element, scrollY);
        });

        // Trigger scroll animations
        this.triggerScrollAnimations();
    }

    applyFadeEffects(element, scrollY) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Calculate visibility percentage
        const visiblePercent = Math.max(0, Math.min(1, 
            (windowHeight - Math.max(0, -rect.top)) / windowHeight
        ));
        
        // Apply fade-in effect
        if (element.dataset.fadeIn) {
            const opacity = Math.min(1, visiblePercent * 2);
            element.style.opacity = opacity;
            element.style.transform = `translateY(${20 - (20 * visiblePercent)}px)`;
        }
    }

    triggerScrollAnimations() {
        const animatedElements = document.querySelectorAll('[data-aos]');
        const windowHeight = window.innerHeight;
        const triggerPoint = windowHeight * 0.8;
        
        animatedElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            
            if (rect.top < triggerPoint && rect.bottom > 0) {
                const animation = el.dataset.aos;
                el.style.animation = `${animation} 0.6s ease forwards`;
                el.dataset.aos = 'done'; // Mark as animated
            }
        });
    }

    animate() {
        // Initial animation trigger
        setTimeout(() => {
            this.triggerScrollAnimations();
        }, 100);
    }

    // Method to add parallax to dynamically loaded elements
    addElement(element, depth = 0.5) {
        this.elements.push({
            element,
            depth,
            offset: 0
        });
    }

    // Method to create floating particles effect
    createParticles(container, count = 50) {
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 1}px;
                height: ${Math.random() * 4 + 1}px;
                background: rgba(255, 255, 255, ${Math.random() * 0.3});
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float ${Math.random() * 10 + 10}s linear infinite;
                animation-delay: ${Math.random() * 5}s;
            `;
            container.appendChild(particle);
        }
        
        // Add CSS for floating animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float {
                0% { transform: translateY(0) translateX(0); opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize parallax effects
document.addEventListener('DOMContentLoaded', () => {
    window.parallaxManager = new ParallaxManager();
    
    // Add floating particles to hero section
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        window.parallaxManager.createParticles(heroSection, 30);
    }
});

// Additional animations
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value.toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Initialize animated counters
document.addEventListener('DOMContentLoaded', () => {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const target = parseInt(counter.textContent);
        counter.textContent = '0';
        animateValue(counter, 0, target, 2000);
    });
});