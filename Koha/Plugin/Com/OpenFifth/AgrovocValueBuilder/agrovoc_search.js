const API_URL = AGROVOC_PLUGIN_URL;

const SOURCE_CODES = {
    en: 'agrovoc',
    fr: 'agrovocf',
    es: 'agrovocs'
};

var selectedTerms = [];
var globalVocid = 'agrovoc';
var globalLang = 'en';

$(document).ready(function() {
    $('.close_window').on('click', function(e) {
        e.preventDefault();
        window.close();
    });

    $('#f_pop').on('submit', function(e) {
        e.preventDefault();
        return false;
    });

    $('#searchTerm').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            searchAPI();
            return false;
        }
    });

    $('#matchType, #lang').select2({
        minimumResultsForSearch: -1,
        width: '140px',
        allowClear: false
    });

    $('#searchTerm').focus();
});

function searchAPI() {
    var searchTerm = $('#searchTerm').val().trim();
    if (!searchTerm) {
        alert(__("Search term cannot be empty"));
        return;
    }

    globalLang = $('#lang').val();

    var apiUrl = API_URL + '&action=search&searchTerm=' + encodeURIComponent(searchTerm) +
                 '&lang=' + encodeURIComponent(globalLang) +
                 '&matchType=' + encodeURIComponent($('#matchType').val());

    $('#loadingIndicator').show();
    $('#results-list').empty();

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        })
        .then(data => {
            $('#loadingIndicator').hide();
            if (data.error) {
                alert(__("Error occurred while searching") + ': ' + data.error);
                return;
            }
            displayResults(data);
        })
        .catch(error => {
            $('#loadingIndicator').hide();
            alert(__("Error occurred while searching") + ': ' + error.message);
        });
}

function displayResults(data) {
    var resultsList = $('#results-list');
    resultsList.empty();

    if (!data.results || data.results.length === 0) {
        resultsList.append('<p class="warning">' + __("No results found") + '</p>');
        return;
    }

    data.results.forEach(function(result) {
        var resultItem = $('<div class="result-item clickable">');
        var resultLink = $('<a href="#" class="result-content">').text(result.prefLabel);
        resultLink.attr('title', __("Browse this term"));
        resultItem.append(resultLink);

        resultItem.on('click', function(e) {
            e.preventDefault();
            globalVocid = result.vocab || 'agrovoc';
            globalLang = result.lang || globalLang;
            $('.result-item').removeClass('selected');
            resultItem.addClass('selected');
            displayDetails(result);
        });

        resultsList.append(resultItem);
    });
}

function displayDetails(result) {
    var detailsView = $('#details-view');
    detailsView.empty();

    var currentDiv = $('<div class="current-concept">');
    currentDiv.append('<strong>' + __("Current term") + ':</strong> ');
    currentDiv.append($('<span>').text(result.prefLabel));
    currentDiv.append(' ');

    var selectBtn = $('<button class="btn btn-xs btn-primary">').text(__("Select"));
    selectBtn.on('click', function(e) {
        e.preventDefault();
        addSelectedTerm(result);
    });
    currentDiv.append(selectBtn);
    detailsView.append(currentDiv);

    fetchAndDisplayConcepts(result.uri, 'broader', __("Broader terms"));
    fetchAndDisplayConcepts(result.uri, 'narrower', __("Narrower terms"));
    fetchAndDisplayConcepts(result.uri, 'related', __("Related terms"));
}

function fetchAndDisplayConcepts(uri, type, title) {
    var section = $('<div class="concept-section">');
    var loadingDiv = $('<div class="loading">').text(__("Loading") + ' ' + title.toLowerCase() + '...');
    section.append(loadingDiv);
    $('#details-view').append(section);

    var apiUrl = API_URL + '&action=fetch_concepts' +
                 '&vocid=' + encodeURIComponent(globalVocid) +
                 '&uri=' + encodeURIComponent(uri) +
                 '&lang=' + encodeURIComponent(globalLang) +
                 '&type=' + encodeURIComponent(type);

    $.get(apiUrl, function(data) {
        loadingDiv.remove();

        if (!data[type] || data[type].length === 0) {
            section.append($('<p class="hint">').text(title + ': ' + __("none found")));
            return;
        }

        section.append($('<h4>').text(title));
        var conceptList = $('<div class="concept-list">');

        data[type].forEach(function(concept) {
            if (!concept || !concept.prefLabel) {
                return;
            }

            var conceptItem = $('<div class="concept-item">');
            var conceptLink = $('<a href="#" class="concept-content">').text(concept.prefLabel);
            conceptLink.attr('title', __("Browse this term"));
            conceptLink.on('click', function(e) {
                e.preventDefault();
                displayDetails(concept);
            });
            conceptItem.append(conceptLink);

            var selectBtn = $('<button class="btn btn-xs btn-success">').text(__("Select"));
            selectBtn.on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                addSelectedTerm(concept);
            });

            var actions = $('<span class="concept-actions">');
            actions.append(selectBtn);
            conceptItem.append(' ').append(actions);
            conceptList.append(conceptItem);
        });

        section.append(conceptList);
    });
}

function addSelectedTerm(term) {
    if (selectedTerms.some(t => t.label === term.prefLabel)) {
        alert(__("Term is already selected") + ': ' + term.prefLabel);
        return;
    }

    selectedTerms.push({
        label: term.prefLabel,
        uri: term.uri,
        lang: globalLang
    });
    updateSelectedTermsList();
}

function updateSelectedTermsList() {
    var selectedTermsList = $('#selected-terms-list');
    var replaceBtn = $('#replace-field-btn');
    var createBtn = $('#create-fields-btn');

    selectedTermsList.empty();
    $('#selected-count').text(selectedTerms.length);

    if (selectedTerms.length === 0) {
        selectedTermsList.append($('.selection-help').clone());
        replaceBtn.prop('disabled', true);
        createBtn.prop('disabled', true);
        return;
    }

    selectedTerms.forEach(function(termObj, index) {
        var termItem = $('<div class="selected-term">');
        termItem.append($('<span class="term-label">').text(termObj.label));

        var removeBtn = $('<button class="btn btn-xs btn-danger">').html('&times;');
        removeBtn.on('click', function(e) {
            e.preventDefault();
            selectedTerms.splice(index, 1);
            updateSelectedTermsList();
        });

        termItem.append(' ').append(removeBtn);
        selectedTermsList.append(termItem);
    });

    replaceBtn.prop('disabled', selectedTerms.length !== 1);
    createBtn.prop('disabled', false);
}

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function replaceFieldFromURL() {
    var index = getQueryParam('li_id');

    if (!index) {
        alert(__("No field index found"));
        return;
    }
    if (selectedTerms.length !== 1) {
        alert(__("Please select exactly one term to replace the field"));
        return;
    }

    applyTerm(index, selectedTerms[0]);
    closePopup();
}

function createFieldFromURL() {
    var index = getQueryParam('li_id');

    if (!index) {
        alert(__("No field index found"));
        return;
    }
    if (selectedTerms.length === 0) {
        alert(__("No terms selected"));
        return;
    }

    var idx = index;
    selectedTerms.forEach(function(termObj) {
        idx = CloneField(idx);
        applyTerm(idx, termObj);
    });
    closePopup();
}

function closePopup() {
    if (opener && !opener.closed) {
        opener.focus();
    }
    window.close();
}

function conceptId(uri) {
    var parts = String(uri).split('_');
    return parts[parts.length - 1];
}

function applyTerm(index, termObj) {
    var li = opener.document.getElementById(index);
    var tagId = index.split('_')[1];
    var inputs = li.getElementsByTagName('input');

    for (var i = 0; i < inputs.length; i++) {
        var inputName = inputs[i].name;

        if (inputName.indexOf('tag_' + tagId + '_subfield_a') === 0) {
            inputs[i].value = termObj.label;
        }
        if (inputName.indexOf('tag_' + tagId + '_subfield_0') === 0) {
            inputs[i].value = termObj.uri;
        }
        if (inputName.indexOf('tag_' + tagId + '_subfield_9') === 0) {
            inputs[i].value = conceptId(termObj.uri);
        }
        if (inputName.indexOf('tag_' + tagId + '_subfield_2') === 0) {
            inputs[i].value = SOURCE_CODES[termObj.lang] || SOURCE_CODES.en;
        }
        if (inputName.indexOf('tag_' + tagId + '_indicator2') === 0) {
            inputs[i].value = '7';
        }
    }
}

function CloneField(index) {
    var original = opener.document.getElementById(index);
    var clone = original.cloneNode(true);
    var new_key = parseInt(Math.random() * 100000);
    var new_id = original.getAttribute('id') + new_key;

    clone.setAttribute('id', new_id);

    var containers = clone.querySelectorAll('[id^="subfield"], [id^="div_indicator"], [id^="field_marceditor"]');
    for (var c = 0; c < containers.length; c++) {
        containers[c].setAttribute('id', containers[c].getAttribute('id') + new_key);
    }

    var fields = clone.querySelectorAll('input, select, textarea');
    for (var i = 0; i < fields.length; i++) {
        var id = fields[i].getAttribute('id');
        var name = fields[i].getAttribute('name');

        if (id) {
            fields[i].setAttribute('id', id + new_key);
        }
        if (name) {
            fields[i].setAttribute('name', name + new_key);
        }
        if (id && id.indexOf('tag_') === 0) {
            fields[i].value = '';
        }
    }

    var labels = clone.querySelectorAll('label[for]');
    for (var l = 0; l < labels.length; l++) {
        labels[l].setAttribute('for', labels[l].getAttribute('for') + new_key);
    }

    original.parentNode.insertBefore(clone, original.nextSibling);
    return new_id;
}
