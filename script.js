import defaultGames from './games.js';

document.addEventListener('DOMContentLoaded', () => {
    const gamesGrid = document.getElementById('games-grid');
    const searchInput = document.getElementById('game-search');
    const searchInputMobile = document.getElementById('game-search-mobile');
    const categoryItems = document.querySelectorAll('.sidebar-nav li[data-category]');
    const categoryTitle = document.getElementById('current-category-title');
    const noGamesMessage = document.getElementById('no-games');
    const gridTitle = document.getElementById('grid-title');
    
    // Sidebar/Mobile Menu elements
    const sidebar = document.getElementById('sidebar');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    
    // Modal elements
    const modal = document.getElementById('game-modal');
    const modalGameName = document.getElementById('modal-game-name');
    const gameIframe = document.getElementById('game-iframe');
    const closeModal = document.getElementById('close-modal');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    // Theme Toggle Logic
    const themeToggle = document.querySelector('.theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'dark';

    if (currentTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'light') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // --- GITHUB LIVE DATA FETCHING ---
    const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/vydixclothing-cell/game/main/games.js';

    let games = [...defaultGames];

    async function fetchLiveGames() {
        try {
            // Add cache busting to get the latest version
            const response = await fetch(GITHUB_RAW_URL + '?t=' + Date.now());
            const text = await response.text();
            
            // Extract the array from the JS file text
            const arrayMatch = text.match(/const games = (\[[\s\S]*?\]);/);
            if (arrayMatch) {
                // Safely evaluate or parse the array string
                const arrayStr = arrayMatch[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"').replace(/,(\s*\])/, '$1');
                try {
                    games = JSON.parse(arrayStr);
                } catch (e) {
                    games = eval(arrayMatch[1]);
                }
                console.log('Live games loaded from GitHub');
                updateCounts();
                renderGames();
            }
        } catch (error) {
            console.error('Failed to fetch live games, using default:', error);
            updateCounts();
            renderGames();
        }
    }

    // Start fetching live games
    fetchLiveGames();

    let currentCategory = 'all';
    let searchQuery = '';

    // Mobile Menu Toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            const icon = mobileMenuToggle.querySelector('i');
            if (sidebar.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Fullscreen Toggle
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (gameIframe.requestFullscreen) {
                gameIframe.requestFullscreen();
            } else if (gameIframe.webkitRequestFullscreen) {
                gameIframe.webkitRequestFullscreen();
            } else if (gameIframe.msRequestFullscreen) {
                gameIframe.msRequestFullscreen();
            }
        });
    }

    const updateCounts = () => {
        const allCount = document.querySelector('li[data-category="all"] .count');
        if (allCount) allCount.textContent = games.length;

        const categories = {};
        games.forEach(game => {
            categories[game.category] = (categories[game.category] || 0) + 1;
        });

        categoryItems.forEach(item => {
            const cat = item.getAttribute('data-category');
            if (cat !== 'all') {
                const countSpan = item.querySelector('.count');
                if (countSpan) countSpan.textContent = categories[cat] || 0;
            }
        });
    };

    const renderGames = () => {
        const filteredGames = games.filter(game => {
            const matchesCategory = currentCategory === 'all' || game.category === currentCategory;
            const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        gamesGrid.innerHTML = '';

        if (filteredGames.length === 0) {
            noGamesMessage.classList.remove('hidden');
            gamesGrid.classList.add('hidden');
        } else {
            noGamesMessage.classList.add('hidden');
            gamesGrid.classList.remove('hidden');

            filteredGames.forEach(game => {
                const gameCard = document.createElement('div');
                gameCard.className = 'game-card';
                gameCard.innerHTML = `
                    <div class="game-image-container">
                        <img src="${game.image}" alt="${game.name}" loading="lazy">
                    </div>
                    <div class="game-info">
                        <h3>${game.name}</h3>
                        <span>${game.category}</span>
                    </div>
                `;
                gameCard.addEventListener('click', () => openGame(game));
                gamesGrid.appendChild(gameCard);
            });
        }

        const displayTitle = currentCategory === 'all' ? 'All Games' : currentCategory;
        categoryTitle.textContent = displayTitle;
        gridTitle.textContent = searchQuery ? `SEARCH RESULTS FOR "${searchQuery.toUpperCase()}"` : displayTitle.toUpperCase();
    };

    const openGame = (game) => {
        modalGameName.textContent = game.name;
        gameIframe.src = game.url;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    const closeGame = () => {
        modal.classList.add('hidden');
        gameIframe.src = '';
        document.body.style.overflow = 'auto';
    };

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            if (searchInputMobile) searchInputMobile.value = searchQuery;
            renderGames();
        });
    }

    if (searchInputMobile) {
        searchInputMobile.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            if (searchInput) searchInput.value = searchQuery;
            renderGames();
        });
    }

    categoryItems.forEach(item => {
        item.addEventListener('click', () => {
            categoryItems.forEach(li => li.classList.remove('active'));
            item.classList.add('active');
            currentCategory = item.getAttribute('data-category');
            renderGames();

            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('active');
                if (mobileMenuToggle) {
                    const icon = mobileMenuToggle.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    });

    if (closeModal) closeModal.addEventListener('click', closeGame);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeGame();
    });
});