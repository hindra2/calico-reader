export const generateHTML = (chapters: { [path: string]: string }, chapterPaths: string[]): string => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * { box-sizing: border-box; }
            html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100vh;
                overflow: hidden;
            }
            #container {
                width: 100%;
                height: 100vh;
                padding: 20px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            #content {
                flex: 1;
                overflow: hidden;
                position: absolute
                margin-bottom: 40px;
            }

            .iframe-container {
                width: 100%;
                height: 100%;
                overflow: hidden;
                display: none;
            }

            .iframe-container.active {
                display: block;
            }

            iframe {
                border: none;
                height: 100%;
                width: 100%;
                pointer-events: none;
            }


            #page-indicator {
                text-align: center;
                font-size: 12px;
                color: #666;
                background: rgba(255, 255, 255, 0.9);
                padding: 5px 10px;
                border-radius: 10px;
                margin: 10px auto 0;
                width: fit-content;
            }
        </style>
    </head>
    <body>
        <div id="container">
            <div id="content">
                <!-- Iframe containers will be created here -->
            </div>
            <div id="page-indicator">1 / 1</div>
        </div>
        <script>
            let currentChapter = 0;
            let currentPage = 0;
            let totalChapters = ${chapterPaths.length};
            let totalPagesInChapter = 1;
            const chapterPaths = ${JSON.stringify(chapterPaths)};
            const chapterContents = ${JSON.stringify(chapters)};
            let iframes = {};

            function createIframe(chapterIndex) {
                console.log('Creating iframe for chapter', chapterIndex);

                const container = document.createElement('div');
                container.className = 'iframe-container';
                container.id = 'container-' + chapterIndex;

                const iframe = document.createElement('iframe');
                iframe.id = 'iframe-' + chapterIndex;

                container.appendChild(iframe);
                document.getElementById('content').appendChild(container);

                // Get content for this chapter
                const chapterPath = chapterPaths[chapterIndex];
                const content = chapterContents[chapterPath];

                console.log('Chapter content length:', content ? content.length : 0);

                // Try the simplest approach first - srcdoc
                iframe.srcdoc = content;

                iframe.onload = function() {
                    console.log('Iframe loaded for chapter', chapterIndex);
                    setupPagination(chapterIndex, iframe, container);
                };

                iframes[chapterIndex] = { iframe, container, pages: 1, ready: false };

                return { iframe, container };
            }

            function setupPagination(chapterIndex, iframe, container) {
                const doc = iframe.contentDocument;
                if (!doc || !doc.body) {
                    console.error('Iframe body not ready');
                    return;
                }

                const width = container.offsetWidth;
                const height = container.offsetHeight;

                // Apply styles for column-based layout with scroll snapping
                Object.assign(doc.body.style, {
                    columnWidth: width + 'px',
                    columnGap: '0px',
                    height: height + 'px',
                    margin: '0',
                    padding: '0',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollSnapType: 'x mandatory', // Enable snap scrolling
                    scrollBehavior: 'smooth',
                });

                // Add snapping style to children
                const style = doc.createElement('style');
                style.textContent =
                    'body > * {' +
                        'scroll-snap-align: start;' +
                        'break-inside: avoid;' +
                    '}';
                doc.head.appendChild(style);

                // Scroll to start
                iframe.contentWindow.scrollTo(0, 0);

                // Wait for content to layout and calculate pages based on snap points
                setTimeout(() => {
                    const scrollable = iframe.contentWindow.document.scrollingElement || doc.documentElement;
                    const maxScrollLeft = scrollable.scrollWidth - scrollable.clientWidth;
                    const pageCount = Math.round(maxScrollLeft / width) + 1;

                    iframes[chapterIndex].pages = pageCount;
                    iframes[chapterIndex].ready = true;

                    if (chapterIndex === currentChapter) {
                        totalPagesInChapter = pageCount;
                        updatePageIndicator();
                        showPage(0);
                    }
                }, 100); // Keep short timeout just for layout to settle
            }


            function showChapter(chapterIndex) {
                console.log('Showing chapter', chapterIndex);

                // Hide all
                Object.values(iframes).forEach(item => {
                    item.container.classList.remove('active');
                });

                // Create if doesn't exist
                if (!iframes[chapterIndex]) {
                    createIframe(chapterIndex);
                }

                // Show current
                iframes[chapterIndex].container.classList.add('active');
                currentChapter = chapterIndex;

                if (iframes[chapterIndex].ready) {
                    totalPagesInChapter = iframes[chapterIndex].pages;
                    showPage(0);
                }
            }

            function showPage(index) {
                const item = iframes[currentChapter];
                if (!item || !item.ready) return;

                const width = item.container.offsetWidth;
                item.iframe.contentWindow.scrollTo({
                    left: width * index,
                    behavior: 'smooth'
                });

                currentPage = index;
                updatePageIndicator();
            }

            function nextPage() {
                if (currentPage < totalPagesInChapter - 1) {
                    showPage(currentPage + 1);
                } else if (currentChapter < totalChapters - 1) {
                    showChapter(currentChapter + 1);
                }
            }

            function prevPage() {
                if (currentPage > 0) {
                    showPage(currentPage - 1);
                } else if (currentChapter > 0) {
                    showChapter(currentChapter - 1);
                }
            }

            function updatePageIndicator() {
                document.getElementById('page-indicator').textContent =
                    (currentPage + 1) + ' / ' + totalPagesInChapter +
                    ' (Ch ' + (currentChapter + 1) + '/' + totalChapters + ')';
            }

            // Touch navigation - make sure it works over iframes
            document.getElementById('container').addEventListener('click', function(e) {
                console.log('Touch navigation triggered');

                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const width = rect.width;

                console.log('Touch at x:', x, 'width:', width);

                if (x < width / 3) {
                    console.log('Previous page');
                    prevPage();
                } else if (x > width * 2 / 3) {
                    console.log('Next page');
                    nextPage();
                } else {
                    console.log('Middle tap');
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'middleTap'
                        }));
                    }
                }
            });

            // Also add event listener to handle React Native messages
            document.addEventListener('message', function(e) {
                try {
                    const data = JSON.parse(e.data);
                    console.log('Received message:', data.type);

                    if (data.type === 'nextPage') {
                        nextPage();
                    } else if (data.type === 'prevPage') {
                        prevPage();
                    } else if (data.type === 'goToChapter') {
                        showChapter(data.chapterIndex);
                    } else if (data.type === 'refreshContent') {
                        // Clean up old iframes
                        Object.values(iframes).forEach(item => {
                            item.container.remove();
                        });
                        iframes = {};
                        currentChapter = 0;
                        currentPage = 0;
                        setTimeout(() => showChapter(0), 100);
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });

            // Initialize
            setTimeout(() => {
                console.log('Initializing...');
                showChapter(0);
            }, 100);
        </script>
    </body>
    </html>
    `;
};
