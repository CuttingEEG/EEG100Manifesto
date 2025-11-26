const { createClient } = supabase
const supabase_url = "https://gsdciyuqxcgkdqmbygci.supabase.co"
const supabase_key = "sb_publishable_Tn-yHR4XPb2VMq58C6VtsQ_-jF7fVin"

const _supabase = createClient(supabase_url, supabase_key);

const stableContainer = document.body

function showSnackbar(message, type = "success", autohideDuration = 3000){

    const snackbar = document.getElementById('snackbar');
    if (!snackbar) {
        console.error("Snackbar element not found!");
        return;
    }
    snackbar.textContent = message;

    snackbar.classList.remove('show', 'success', 'error'); // Remove all dynamic classes first
    
    snackbar.classList.add('show');
    
    snackbar.classList.add(type);

    clearTimeout(snackbar.timeoutId);
    snackbar.timeoutId = setTimeout(() => {
        snackbar.classList.remove('show');
    }, autohideDuration);
}

function gatherResponses() {

    let formData = {}

    let data_input = document.querySelectorAll(".data-input")
    data_input.forEach(input => {
        if (input.type === 'checkbox') {
            formData[input.name] = input.checked;
        } else if (input.type === 'number') {
             formData[input.name] = input.valueAsNumber;
        } else {
            formData[input.name] = input.value;
        }
    });

    return formData
}

if (stableContainer) {
    stableContainer.addEventListener('submit', async (event) => {

        const targetForm = event.target.closest('#manifesto-form');

        if (targetForm) {
            event.preventDefault();
            
            const submitButton = targetForm.querySelector('#sign-button');
            if (submitButton) {
                var originalSubmitValue = submitButton.value;
                submitButton.disabled = true; // Disable to prevent double submission
                submitButton.value = 'Submitting...'; // User feedback
            }

            const submissionData = gatherResponses(); // Call your existing function

            console.log("Data collected: ", submissionData)

            try {
                // Insert data into Supabase
                // Supabase's 'insert' method expects an array of objects, even for a single row.
                const { data: insertedData, error } = await _supabase
                    .from('signatories') // Your table name in Supabase
                    .insert([submissionData]);

                if (error) {
                    throw error; // Throw error to be caught by the catch block
                }

                // --- Success Actions ---
                showSnackbar('Data submitted successfully! Thank you.');
                console.log('Inserted participant data:', insertedData);

                targetForm.reset(); // Reset the form fields
                // Scroll to the top of the page (or your desired 'start' element)
                window.scrollTo({ top: 0, behavior: 'auto' }); // Scrolls to absolute top
                // OR: document.getElementById('form-title').scrollIntoView({ behavior: 'smooth' }); // Scrolls to a specific element

            } catch (error) {
                // --- Error Actions ---
                showSnackbar(`Error submitting data: ${error.message}`, 'error', 10000); // Keep error toast visible (autoHide=false)
                console.error('Submission error:', error);
            } finally {
                // This block always runs, whether try or catch was executed
                if (submitButton) {
                    submitButton.disabled = false; // Re-enable the button
                    submitButton.value = originalSubmitValue; // Reset button text
                }
            }
        }
    })
} else {
    console.error("Error: Stable parent container for form submission not found! Check 'app-container' ID.");
}

function toggleCheckboxes(event) {
    let tar = event.target;

    let allListNodes = tar.parentElement.nextElementSibling.children

    Array.from(allListNodes).forEach(el => el.firstElementChild.checked = tar.checked);
}

function toggleFold(state) {
    allDetails = document.querySelectorAll("details");
    Array.from(allDetails).forEach(el => el.open = state);
}

// Make all external links open in new tab (only on references page)
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the references page
    if (window.location.pathname.includes('/references/') || window.location.pathname.endsWith('/references') || document.title.toLowerCase().includes('references')) {
        // Select all links that start with http or https (external links)
        const externalLinks = document.querySelectorAll('a[href^="http"], a[href^="https"]');
        
        externalLinks.forEach(function(link) {
            // Skip links in navigation areas - be more specific based on actual HTML structure
            const isInNav = link.closest('.md-header') || 
                           link.closest('.md-nav') ||
                           link.closest('.md-sidebar') ||
                           link.closest('.md-footer') ||
                           link.closest('[data-md-component="header"]') ||
                           link.closest('[data-md-component="navigation"]') ||
                           link.closest('[data-md-component="sidebar"]') ||
                           link.closest('[data-md-type="navigation"]');
            
            // Only add target="_blank" if it doesn't already have a target attribute and not in navigation
            if (!link.hasAttribute('target') && !isInNav) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer'); // Security best practice
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", function() {
    const refLinks = document.querySelectorAll('a[href*="references"]');
    if (refLinks.length === 0) return;

    let refUrl = refLinks[0].getAttribute('href').split('#')[0];
    
    fetch(refUrl)
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const refMap = {};
            
            const elementsWithIds = doc.querySelectorAll('[id]');
            elementsWithIds.forEach(el => {
                refMap[el.id] = el.innerHTML;
            });
            
            setupTooltips(refLinks, refMap);
        })
        .catch(err => console.error("Failed to load references for tooltips", err));
});

function setupTooltips(links, refMap) {
    const tooltip = document.createElement('div');
    tooltip.className = 'reference-tooltip';
    tooltip.style.display = 'none';
    tooltip.style.position = 'absolute';
    document.body.appendChild(tooltip);
    
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href.includes('#')) return;
        const id = href.split('#')[1];
        
        if (refMap[id]) {
            link.addEventListener('mouseenter', (e) => {
                tooltip.innerHTML = refMap[id];
                tooltip.style.display = 'block';
                positionTooltip(e, tooltip);
            });
            
            link.addEventListener('mousemove', (e) => {
                positionTooltip(e, tooltip);
            });
            
            link.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        }
    });
}

function positionTooltip(e, tooltip) {
    const x = e.pageX + 15;
    const y = e.pageY + 15;
    
    // Basic boundary check
    const tooltipRect = tooltip.getBoundingClientRect();
    const bodyRect = document.body.getBoundingClientRect();
    
    let finalX = x;
    let finalY = y;
    
    if (x + tooltipRect.width > bodyRect.width) {
        finalX = e.pageX - tooltipRect.width - 15;
    }
    
    tooltip.style.left = finalX + 'px';
    tooltip.style.top = finalY + 'px';
}
