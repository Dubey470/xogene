import React, { useEffect, useState, memo } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

// Component for the Drug Search Page
const DrugSearchPage = memo(() => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedTerms, setSuggestedTerms] = useState([]);
  const [error, setError] = useState('');


  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSearch = async () => {
    try {
      
      const response = await axios.get(`${API_BASE_URL}/drugs.json?name=${searchTerm}`);
      console.log('API Response:', response.data);
  
      if (response.data.suggestionGroup && response.data.suggestionGroup.suggestionList) {
        setSuggestedTerms(response.data.suggestionGroup.suggestionList.suggestion);
      } else if (response.data.nlmRxNorm && response.data.nlmRxNorm.drugGroup) {
        const drugGroup = response.data.nlmRxNorm.drugGroup;
        const conceptGroup = drugGroup.conceptGroup;
  
        if (conceptGroup && conceptGroup.length > 0) {
          const allConceptProperties = conceptGroup.flatMap((cg) => cg.conceptProperties);
          setSearchResults(allConceptProperties);
        } else {
          setError('No results found');
        }
      } else {
        setError('No results found');
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
      setError('Failed to fetch search results');
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestedTerm) => {
    setSearchTerm(suggestedTerm);
    handleSearch();
  };

  const renderSearchResults = () => {
    if (error) {
      return <div>{error}</div>;
    } else if (suggestedTerms.length > 0) {
      return (
        <div>
          <p>Did you mean:</p>
          <ul>
            {suggestedTerms.map((term, index) => (
              <li key={index} onClick={() => handleSuggestionClick(term)}>{term}</li>
            ))}
          </ul>
        </div>
      );
    } else {
      return (
        <ul>
          {searchResults.map((result) => (
            <li key={result.rxcui}>
              <Link to={`/drugs/${result.name}`}>{result.name}</Link>
            </li>
          ))}
        </ul>
      );
    }
  };

  return (
    <div>
      <h1>Drug Search</h1>
      <input type="text" value={searchTerm} onChange={handleSearchChange} onKeyPress={handleKeyPress} />
      <button onClick={handleSearch}>Search</button>
      <div>
        {renderSearchResults()}
      </div>
    </div>
  );
});

// Component for Drug Details Page
const DrugDetailsPage = memo(({ match }) => {
  const [drugDetails, setDrugDetails] = useState(null);
  const [ndcList, setNdcList] = useState([]);
  const [error, setError] = useState('');

  const rxcui = match.params.rxcui;

  const fetchDrugDetails = async () => {
    try {
      const detailsResponse = await axios.get(`${API_BASE_URL}/rxcui/${rxcui}.json`);
      setDrugDetails(detailsResponse.data.nlmRxNorm.drugGroup.conceptGroup[0].conceptProperties[0]);

      const ndcsResponse = await axios.get(`${API_BASE_URL}/rxcui/${rxcui}/ndcs.json`);
      if (ndcsResponse.data.nlmRxNorm && ndcsResponse.data.nlmRxNorm.ndcGroup) {
        setNdcList(ndcsResponse.data.nlmRxNorm.ndcGroup.ndcList);
      }
    } catch (error) {
      console.error('Error fetching drug details:', error);
      setError('Failed to fetch drug details');
    }
  };

  useEffect(() => {
    fetchDrugDetails();
  }, [rxcui]);

  if (error) {
    return <div>{error}</div>;
  }

  if (!drugDetails) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Drug Details</h1>
      <h2>{drugDetails.name}</h2>
      <p>RxCUI: {drugDetails.rxcui}</p>
      <p>Synonym: {drugDetails.synonym}</p>

      <h3>NDCs:</h3>
      <ul>
        {ndcList.map((ndc) => (
          <li key={ndc.ndc}>{ndc.ndc}</li>
        ))}
      </ul>
    </div>
  );
});

// Main App Component
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DrugSearchPage />} />
        <Route path="/drugs/:rxcui" element={<DrugDetailsPage />} />
      </Routes>
    </Router>
  );
};

export default App;
